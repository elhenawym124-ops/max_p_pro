import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    PlusIcon,
    TrashIcon,
    ExclamationCircleIcon,
    MinusIcon,
    EllipsisVerticalIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import { useCurrency } from '../../../hooks/useCurrency';
import { OrderItem } from '../types';
import { validatePrice, validateQuantity } from '../../../utils/validation';
import DeleteItemConfirmModal from './DeleteItemConfirmModal';

interface OrderItemsCardProps {
    isEditing: boolean;
    items: OrderItem[];
    currency: string;
    totals: {
        subtotal: number;
        shipping: number;
        tax: number;
        total: number;
    };
    onAddItem: () => void;
    onItemChange: (index: number, field: string, value: any) => void;
    onRemoveItem: (index: number) => void;
    onShippingChange?: (value: number) => void;
    onTaxChange?: (value: number) => void;
}

const OrderItemsCard: React.FC<OrderItemsCardProps> = ({
    isEditing,
    items,

    totals,
    onAddItem,
    onItemChange,
    onRemoveItem,
    onShippingChange,
    onTaxChange
}) => {
    const { t } = useTranslation();
    const { formatPrice } = useCurrency();
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; index: number; itemName: string; itemDetails: string }>({
        isOpen: false,
        index: -1,
        itemName: '',
        itemDetails: ''
    });
    const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

    const handleDeleteClick = (index: number, item: OrderItem) => {
        const details = [];
        if (item.productColor) details.push(`اللون: ${item.productColor}`);
        if (item.productSize) details.push(`المقاس: ${item.productSize}`);
        if (item.quantity) details.push(`الكمية: ${item.quantity}`);

        setDeleteModal({
            isOpen: true,
            index,
            itemName: item.productName,
            itemDetails: details.join(' • ')
        });
        setOpenMenuIndex(null);
    };

    const handleConfirmDelete = () => {
        onRemoveItem(deleteModal.index);
        setDeleteModal({ isOpen: false, index: -1, itemName: '', itemDetails: '' });
    };

    const handlePriceChange = (index: number, value: string) => {
        const numValue = parseFloat(value);
        const validation = validatePrice(numValue);

        if (!validation.isValid && value !== '') {
            setValidationErrors(prev => ({ ...prev, [`price_${index}`]: validation.error || '' }));
        } else {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`price_${index}`];
                return newErrors;
            });
        }

        onItemChange(index, 'price', isNaN(numValue) ? 0 : numValue);
    };

    const handleQuantityChange = (index: number, value: number) => {
        const validation = validateQuantity(value);

        if (!validation.isValid) {
            setValidationErrors(prev => ({ ...prev, [`quantity_${index}`]: validation.error || '' }));
        } else {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`quantity_${index}`];
                return newErrors;
            });
        }

        onItemChange(index, 'quantity', value);
    };

    const incrementQuantity = (index: number, currentQty: number) => {
        handleQuantityChange(index, currentQty + 1);
    };

    const decrementQuantity = (index: number, currentQty: number) => {
        if (currentQty > 1) {
            handleQuantityChange(index, currentQty - 1);
        }
    };

    // Get product image from metadata
    const getProductImage = (item: OrderItem): string | null => {
        try {
            if (item.metadata && typeof item.metadata === 'object') {
                const meta = item.metadata as any;
                if (meta.image) return meta.image;
                if (meta.images && Array.isArray(meta.images) && meta.images.length > 0) {
                    return meta.images[0];
                }
            }
        } catch (e) {
            console.error('Error parsing product image:', e);
        }
        return null;
    };

    // Get stock info from metadata
    const getStockInfo = (item: OrderItem): { stock: number; status: 'available' | 'low' | 'out' } => {
        try {
            if (item.metadata && typeof item.metadata === 'object') {
                const meta = item.metadata as any;
                const stock = meta.stock || 0;

                if (stock <= 0) return { stock, status: 'out' };
                if (stock < 5) return { stock, status: 'low' };
                return { stock, status: 'available' };
            }
        } catch (e) { }
        return { stock: 0, status: 'available' };
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {t('orderDetails.products')}
                        </h3>
                        <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-full">
                            {items.length}
                        </span>
                    </div>
                    {isEditing && (
                        <button
                            onClick={onAddItem}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>إضافة منتج</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <PhotoIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد منتجات في هذا الطلب</p>
                    </div>
                ) : (
                    items.map((item, index) => {
                        const productImage = getProductImage(item);
                        const stockInfo = getStockInfo(item);
                        const itemTotal = (item.price || 0) * (item.quantity || 1);
                        const hasQuantityError = validationErrors[`quantity_${index}`];
                        const hasPriceError = validationErrors[`price_${index}`];

                        return (
                            <div key={index} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                <div className="flex gap-4">
                                    {/* Product Image */}
                                    <div className="flex-shrink-0">
                                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                            {productImage ? (
                                                <img
                                                    src={productImage}
                                                    alt={item.productName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex-1">
                                                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                                                    {item.productName}
                                                </h4>

                                                {/* SKU & Stock */}
                                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                    {item.metadata && (item.metadata as any).sku && (
                                                        <span className="font-mono">SKU: {(item.metadata as any).sku}</span>
                                                    )}
                                                    {stockInfo.stock > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className={`font-semibold ${stockInfo.status === 'available' ? 'text-green-600 dark:text-green-400' :
                                                                stockInfo.status === 'low' ? 'text-orange-600 dark:text-orange-400' :
                                                                    'text-red-600 dark:text-red-400'
                                                                }`}>
                                                                {stockInfo.status === 'available' ? '🟢 متوفر' :
                                                                    stockInfo.status === 'low' ? `🟡 متبقي ${stockInfo.stock}` :
                                                                        '🔴 نفذ'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Variants */}
                                                {(() => {
                                                    // Try to get color and size from item or metadata
                                                    let displayColor = item.productColor;
                                                    let displaySize = item.productSize;

                                                    // DEBUG LOGGING
                                                    console.log(`🔍 Item [${index}] Variant Check:`, {
                                                        productColor: item.productColor,
                                                        productSize: item.productSize,
                                                        color: (item as any).color,
                                                        size: (item as any).size,
                                                        metadata: item.metadata,
                                                        variant: (item as any).variant // Check if variant data exists
                                                    });

                                                    // If not in direct fields, try metadata
                                                    if (!displayColor || !displaySize) {
                                                        try {
                                                            const meta = item.metadata as any;
                                                            if (meta) {
                                                                if (!displayColor && meta.color) displayColor = meta.color;
                                                                if (!displaySize && meta.size) displaySize = meta.size;

                                                                // Try attributeValues
                                                                if (meta.attributeValues) {
                                                                    if (!displayColor && meta.attributeValues['اللون']) {
                                                                        displayColor = meta.attributeValues['اللون'];
                                                                    }
                                                                    if (!displaySize && meta.attributeValues['المقاس']) {
                                                                        displaySize = meta.attributeValues['المقاس'];
                                                                    }
                                                                }

                                                                // Try attributes array
                                                                if (meta.attributes && Array.isArray(meta.attributes)) {
                                                                    meta.attributes.forEach((attr: any) => {
                                                                        if (attr.type === 'color' && attr.option && !displayColor) {
                                                                            displayColor = attr.option;
                                                                        }
                                                                        if (attr.type === 'size' && attr.option && !displaySize) {
                                                                            displaySize = attr.option;
                                                                        }
                                                                    });
                                                                }
                                                            }
                                                        } catch (e) {
                                                            console.error('Error parsing variant metadata:', e);
                                                        }
                                                    }

                                                    return (displayColor || displaySize) ? (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {displayColor && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-sm font-semibold border border-blue-200 dark:border-blue-800">
                                                                    🎨 {displayColor}
                                                                </span>
                                                            )}
                                                            {displaySize && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md text-sm font-semibold border border-purple-200 dark:border-purple-800">
                                                                    📏 {displaySize}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>

                                            {/* Actions Menu */}
                                            {isEditing && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenMenuIndex(openMenuIndex === index ? null : index)}
                                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    >
                                                        <EllipsisVerticalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                    </button>

                                                    {openMenuIndex === index && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setOpenMenuIndex(null)}
                                                            />
                                                            <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                                                                <button
                                                                    onClick={() => handleDeleteClick(index, item)}
                                                                    className="w-full px-4 py-2 text-right text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                    <span>حذف المنتج</span>
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Price & Quantity */}
                                        <div className="grid grid-cols-3 gap-4 items-end">
                                            {/* Price */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                                    💰 السعر
                                                </label>
                                                {isEditing ? (
                                                    <div>
                                                        <input
                                                            type="number"
                                                            value={item.price || 0}
                                                            onChange={(e) => handlePriceChange(index, e.target.value)}
                                                            min="0.01"
                                                            max="1000000"
                                                            step="0.01"
                                                            className={`w-full px-3 py-2 border rounded-lg text-sm font-semibold dark:bg-gray-700 dark:text-gray-100 ${hasPriceError
                                                                ? 'border-red-500 dark:border-red-400'
                                                                : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                                                }`}
                                                        />
                                                        {hasPriceError && (
                                                            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                                                <ExclamationCircleIcon className="w-3 h-3" />
                                                                {hasPriceError}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                        {formatPrice(item.price || 0)}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Quantity */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                                    📦 الكمية
                                                </label>
                                                {isEditing ? (
                                                    <div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => decrementQuantity(index, item.quantity || 1)}
                                                                disabled={item.quantity <= 1}
                                                                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                                                            >
                                                                <MinusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={item.quantity || 1}
                                                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                                                min="1"
                                                                max="9999"
                                                                className={`w-16 px-2 py-2 border rounded-lg text-center text-sm font-bold dark:bg-gray-700 dark:text-gray-100 ${hasQuantityError
                                                                    ? 'border-red-500 dark:border-red-400'
                                                                    : 'border-gray-300 dark:border-gray-600'
                                                                    }`}
                                                            />
                                                            <button
                                                                onClick={() => incrementQuantity(index, item.quantity || 1)}
                                                                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                                            >
                                                                <PlusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                                            </button>
                                                        </div>
                                                        {hasQuantityError && (
                                                            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                                                <ExclamationCircleIcon className="w-3 h-3" />
                                                                {hasQuantityError}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                        {item.quantity || 1}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Total */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                                    💵 الإجمالي
                                                </label>
                                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                    {formatPrice(itemTotal)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Totals */}
            {items.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-2 max-w-sm mr-auto">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">المجموع الفرعي:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-600 dark:text-gray-400">الشحن:</span>
                            {isEditing && onShippingChange ? (
                                <input
                                    type="number"
                                    value={totals.shipping}
                                    onChange={(e) => onShippingChange(parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                />
                            ) : (
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(totals.shipping)}</span>
                            )}
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-600 dark:text-gray-400">الضريبة:</span>
                            {isEditing && onTaxChange ? (
                                <input
                                    type="number"
                                    value={totals.tax}
                                    onChange={(e) => onTaxChange(parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                />
                            ) : (
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(totals.tax)}</span>
                            )}
                        </div>
                        <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                            <div className="flex justify-between">
                                <span className="text-base font-bold text-gray-900 dark:text-gray-100">الإجمالي:</span>
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(totals.total)}</span>
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                            <span>الإجمالي يتم حسابه تلقائياً بناءً على المنتجات والشحن والضرائب</span>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteItemConfirmModal
                isOpen={deleteModal.isOpen}
                itemName={deleteModal.itemName}
                itemDetails={deleteModal.itemDetails}
                onConfirm={handleConfirmDelete}
                onClose={() => setDeleteModal({ isOpen: false, index: -1, itemName: '', itemDetails: '' })}
            />
        </div>
    );
};

export default OrderItemsCard;
