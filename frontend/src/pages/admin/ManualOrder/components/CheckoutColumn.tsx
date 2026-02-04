import React, { useState, useEffect, useMemo } from 'react';
import {
    UserIcon,
    MapPinIcon,
    BanknotesIcon,
    CheckCircleIcon,
    MagnifyingGlassIcon,
    TruckIcon,
    TicketIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    ShoppingCartIcon,
    PrinterIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';

// قائمة المحافظات المصرية
const EGYPT_GOVERNORATES = [
    'القاهرة',
    'الجيزة',
    'الإسكندرية',
    'الدقهلية',
    'البحر الأحمر',
    'البحيرة',
    'الفيوم',
    'الغربية',
    'الإسماعيلية',
    'المنوفية',
    'المنيا',
    'القليوبية',
    'الوادي الجديد',
    'السويس',
    'أسوان',
    'أسيوط',
    'بني سويف',
    'بورسعيد',
    'دمياط',
    'الشرقية',
    'جنوب سيناء',
    'كفر الشيخ',
    'مطروح',
    'الأقصر',
    'قنا',
    'شمال سيناء',
    'سوهاج'
];
import { customerService } from '../../../../services/customerService';
import { apiClient } from '../../../../services/apiClient';
import { toast } from 'react-hot-toast';
import { CartItem } from '../types';
import { useNavigate } from 'react-router-dom';

interface CheckoutColumnProps {
    cartItems: CartItem[];
    onClearCart?: () => void;
}

interface ShippingInfo {
    zoneId: string | null;
    price: number;
    deliveryTime: string;
    governorate: string | null;
}

interface CouponInfo {
    id: string;
    code: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    discountAmount: number;
}

const CheckoutColumn: React.FC<CheckoutColumnProps> = ({ cartItems, onClearCart }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    // Customer Form State
    const [phone, setPhone] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [address, setAddress] = useState('');
    const [governorate, setGovernorate] = useState('');
    const [area, setArea] = useState('');
    const [notes, setNotes] = useState('');

    // Order Settings
    const [status, setStatus] = useState('PENDING'); // PENDING, CONFIRMED
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    // Shipping State
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [loadingShipping, setLoadingShipping] = useState(false);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<CouponInfo | null>(null);
    const [loadingCoupon, setLoadingCoupon] = useState(false);

    // Manual Discount State
    const [manualDiscount, setManualDiscount] = useState(0);

    // Scheduled Order State
    const [isScheduledOrder, setIsScheduledOrder] = useState(false);
    const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState('');
    const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState('');
    const [scheduledNotes, setScheduledNotes] = useState('');

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

    // Calculate totals
    const subtotal = useMemo(() =>
        cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        [cartItems]
    );

    const couponDiscount = appliedCoupon?.discountAmount || 0;
    const shippingCost = shippingInfo?.price || 0;
    const totalDiscount = couponDiscount + manualDiscount;
    const grandTotal = subtotal - totalDiscount + shippingCost;

    // Debounced Phone Search
    useEffect(() => {
        const searchCustomer = async () => {
            if (phone.length < 10) return; // Wait for full number

            try {
                setSearching(true);
                // Using existing search API which likely searches name/phone
                const results = await customerService.searchCustomers(phone);

                // Find exact phone match
                const customer = results.find((c: any) => c.phone === phone || c.phone?.includes(phone));

                if (customer) {
                    setFirstName(customer.firstName || '');
                    setLastName(customer.lastName || '');
                    setAddress(customer.address || '');
                    setGovernorate(customer.governorate || customer.city || '');
                    setArea(customer.area || '');
                    toast.success('تم العثور على العميل!');
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setSearching(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (phone) searchCustomer();
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [phone]);

    // Fetch shipping cost when governorate changes
    useEffect(() => {
        const fetchShippingCost = async () => {
            if (!governorate || governorate.length < 2) {
                setShippingInfo(null);
                return;
            }

            try {
                setLoadingShipping(true);
                const response = await apiClient.get(`/shipping-zones/find-price?governorate=${encodeURIComponent(governorate)}`);

                if (response.data.success) {
                    setShippingInfo(response.data.data);
                }
            } catch (error) {
                console.error('Shipping fetch error:', error);
                setShippingInfo(null);
            } finally {
                setLoadingShipping(false);
            }
        };

        const timeoutId = setTimeout(fetchShippingCost, 500);
        return () => clearTimeout(timeoutId);
    }, [governorate]);

    // Apply Coupon
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            toast.error('أدخل كود الكوبون');
            return;
        }

        if (subtotal <= 0) {
            toast.error('أضف منتجات للسلة أولاً');
            return;
        }

        try {
            setLoadingCoupon(true);
            const response = await apiClient.post('/coupons/validate', {
                code: couponCode.trim(),
                orderAmount: subtotal
            });

            if (response.data.success) {
                const { coupon, discountAmount } = response.data.data;
                setAppliedCoupon({
                    ...coupon,
                    discountAmount
                });
                toast.success(`تم تطبيق الكوبون: خصم ${discountAmount.toLocaleString()} ج.م`);
                setCouponCode('');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'كوبون غير صالح');
        } finally {
            setLoadingCoupon(false);
        }
    };

    // Remove Coupon
    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        toast.success('تم إزالة الكوبون');
    };

    // Reset form after successful order
    const resetForm = () => {
        setPhone('');
        setFirstName('');
        setLastName('');
        setAddress('');
        setGovernorate('');
        setArea('');
        setNotes('');
        setAppliedCoupon(null);
        setCouponCode('');
        setManualDiscount(0);
        setShippingInfo(null);
        setIsScheduledOrder(false);
        setScheduledDeliveryDate('');
        setScheduledDeliveryTime('');
        setScheduledNotes('');
        onClearCart?.();
    };

    const handleCreateOrder = async () => {
        if (cartItems.length === 0) {
            toast.error('السلة فارغة');
            return;
        }
        if (!phone || !firstName) {
            toast.error('بيانات العميل ناقصة');
            return;
        }

        // Show confirmation modal instead of browser confirm
        setShowConfirmModal(true);
    };

    const confirmCreateOrder = async () => {
        setShowConfirmModal(false);

        try {
            setLoading(true);

            const scheduledDateTime = isScheduledOrder && scheduledDeliveryDate
                ? new Date(`${scheduledDeliveryDate}${scheduledDeliveryTime ? 'T' + scheduledDeliveryTime : 'T00:00:00'}`).toISOString()
                : null;

            const payload = {
                products: cartItems.map(item => ({
                    productId: item.productId,
                    productName: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    variantId: item.variantId,
                    sku: item.sku,
                    productColor: item.color,
                    productSize: item.size,
                    productImage: item.image
                })),
                customerPhone: phone,
                customerName: `${firstName} ${lastName}`.trim(),
                customerAddress: address,
                governorate: governorate,
                city: area,
                notes: notes,
                status: isScheduledOrder ? 'SCHEDULED' : status,
                paymentMethod: paymentMethod,
                extractionMethod: 'manual_admin',
                conversationId: 'manual',
                platform: 'manual',
                source: 'manual_entry',
                // New fields for shipping and discount
                shippingCost: shippingCost,
                shippingZoneId: shippingInfo?.zoneId,
                couponId: appliedCoupon?.id,
                couponCode: appliedCoupon?.code,
                couponDiscount: couponDiscount,
                manualDiscount: manualDiscount,
                subtotal: subtotal,
                totalAmount: grandTotal,
                // Scheduled order fields
                isScheduled: isScheduledOrder,
                scheduledDeliveryDate: scheduledDateTime,
                scheduledNotes: isScheduledOrder ? scheduledNotes : undefined
            };

            const response = await apiClient.post('/orders-enhanced', payload);

            if (response.data.success) {
                toast.success('تم إنشاء الطلب بنجاح!');

                // Get order ID and show success modal
                const orderId = response.data.order?.id || response.data.data?.id;
                setCreatedOrderId(orderId);
                setShowSuccessModal(true);
            } else {
                toast.error('فشل إنشاء الطلب: ' + (response.data.error || 'خطأ غير معروف'));
            }

        } catch (error: any) {
            console.error('Create order error:', error);
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الطلب');
        } finally {
            setLoading(false);
        }
    };

    // Check for stock warnings
    const stockWarnings = cartItems.filter(item => item.quantity > item.stock);

    return (
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '100%', maxHeight: '100%' }}>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">بيانات العميل والدفع</h2>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-6 manual-order-scroll manual-order-column">

                {/* Customer Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        بيانات العميل
                    </h3>

                    <div className="relative">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">رقم الهاتف <span className="text-red-500 dark:text-red-400">*</span></label>
                        <div className="relative">
                            <input
                                type="text"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-right dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                placeholder="01xxxxxxxxx"
                                dir="ltr"
                            />
                            {searching && <MagnifyingGlassIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3 top-3 animate-bounce" />}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">الاسم الأول <span className="text-red-500 dark:text-red-400">*</span></label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">الاسم الأخير</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">المحافظة <span className="text-red-500 dark:text-red-400">*</span></label>
                        <select
                            value={governorate}
                            onChange={e => setGovernorate(e.target.value)}
                            className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        >
                            <option value="">اختر المحافظة...</option>
                            {EGYPT_GOVERNORATES.map(gov => (
                                <option key={gov} value={gov}>{gov}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">المنطقة/المدينة</label>
                        <input
                            type="text"
                            value={area}
                            onChange={e => setArea(e.target.value)}
                            className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                            placeholder="مثال: مدينة نصر، المعادي، الدقي..."
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">العنوان بالتفصيل</label>
                        <textarea
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 h-20 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                            placeholder="اسم الشارع، رقم العمارة، علامة مميزة..."
                        />
                        <MapPinIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-8" />
                    </div>
                </div>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Shipping Info */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <TruckIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        الشحن
                    </h3>

                    {loadingShipping ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                            جاري حساب تكلفة الشحن...
                        </div>
                    ) : shippingInfo?.zoneId ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-green-700 dark:text-green-400">تكلفة الشحن ({shippingInfo.governorate})</span>
                                <span className="font-bold text-green-700 dark:text-green-400">{shippingInfo.price.toLocaleString()} ج.م</span>
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                مدة التوصيل: {shippingInfo.deliveryTime}
                            </div>
                        </div>
                    ) : governorate ? (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                لا توجد منطقة شحن لهذه المحافظة
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 dark:text-gray-500">
                            أدخل المحافظة لحساب الشحن
                        </div>
                    )}
                </div>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Coupon & Discount */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <TicketIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        الخصومات
                    </h3>

                    {/* Coupon Input */}
                    {!appliedCoupon ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={couponCode}
                                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="كود الكوبون"
                                className="flex-1 border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                            />
                            <button
                                onClick={handleApplyCoupon}
                                disabled={loadingCoupon || !couponCode.trim()}
                                className="px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md text-sm hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                            >
                                {loadingCoupon ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : 'تطبيق'}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{appliedCoupon.code}</span>
                                    <span className="text-xs text-blue-600 dark:text-blue-400 mr-2">({appliedCoupon.name})</span>
                                </div>
                                <button
                                    onClick={handleRemoveCoupon}
                                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                خصم: -{appliedCoupon.discountAmount.toLocaleString()} ج.م
                            </div>
                        </div>
                    )}

                    {/* Manual Discount */}
                    <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">خصم يدوي (ج.م)</label>
                        <input
                            type="number"
                            value={manualDiscount || ''}
                            onChange={e => setManualDiscount(parseFloat(e.target.value) || 0)}
                            className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100"
                            placeholder="0"
                            min="0"
                        />
                    </div>
                </div>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Order Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <BanknotesIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        تفاصيل الطلب
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">طريقة الدفع</label>
                            <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            >
                                <option value="CASH">الدفع عند الاستلام (COD)</option>
                                <option value="wallet">محفظة إلكترونية</option>
                                <option value="insta">Instapay</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">حالة الطلب</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            >
                                <option value="PENDING">جديد (PENDING)</option>
                                <option value="CONFIRMED">مؤكد (CONFIRMED)</option>
                                <option value="PROCESSING">جاري التجهيز</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ملاحظات داخلية</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 h-16 resize-none text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                            placeholder="أي ملاحظات إضافية للتيم..."
                        />
                    </div>
                </div>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Scheduled Order Section */}
                <div className="space-y-3">
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isScheduledOrder}
                                onChange={(e) => setIsScheduledOrder(e.target.checked)}
                                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <CalendarIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                طلب مجدول (استلام في وقت محدد)
                            </span>
                        </label>

                        {isScheduledOrder && (
                            <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            تاريخ الاستلام <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={scheduledDeliveryDate}
                                            onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                                            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            وقت الاستلام
                                        </label>
                                        <input
                                            type="time"
                                            value={scheduledDeliveryTime}
                                            onChange={(e) => setScheduledDeliveryTime(e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        ملاحظات الجدولة
                                    </label>
                                    <textarea
                                        value={scheduledNotes}
                                        onChange={(e) => setScheduledNotes(e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                        rows={2}
                                        placeholder="مثال: عيد ميلاد - يرجى التغليف الخاص"
                                    />
                                </div>
                                <div className="flex items-start gap-2 text-xs text-orange-700 dark:text-orange-300">
                                    <CalendarIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <p>
                                        سيتم تحويل الطلب تلقائياً للحالة التالية عند حلول الموعد المحدد
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Stock Warnings */}
            {stockWarnings.length > 0 && (
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-700">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        <span>تحذير: بعض المنتجات تتجاوز المخزون المتاح</span>
                    </div>
                </div>
            )}

            {/* Order Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">إجمالي المنتجات ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} قطعة)</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{subtotal.toLocaleString()} ج.م</span>
                </div>

                {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>الخصم</span>
                        <span>-{totalDiscount.toLocaleString()} ج.م</span>
                    </div>
                )}

                {shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">الشحن</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">+{shippingCost.toLocaleString()} ج.م</span>
                    </div>
                )}

                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-gray-100">الإجمالي النهائي</span>
                    <span className="text-blue-600 dark:text-blue-400">{grandTotal.toLocaleString()} ج.م</span>
                </div>

                <button
                    onClick={handleCreateOrder}
                    disabled={loading || cartItems.length === 0}
                    className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-white font-bold transition-all mt-3 ${loading || cartItems.length === 0
                        ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'
                        : 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 shadow-lg hover:shadow-xl'
                        }`}
                >
                    {loading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <CheckCircleIcon className="w-6 h-6" />
                            <span>إنشاء الطلب ({grandTotal.toLocaleString()} ج.م)</span>
                        </>
                    )}
                </button>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-black/50 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                                <ShoppingCartIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">تأكيد إنشاء الطلب</h3>
                            <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                                هل أنت متأكد من إنشاء هذا الطلب؟
                            </p>

                            {/* Order Summary in Modal */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">العميل:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{firstName} {lastName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">الهاتف:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100" dir="ltr">{phone}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">عدد المنتجات:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{cartItems.length} منتج ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} قطعة)</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 font-bold">
                                    <span className="text-gray-900 dark:text-gray-100">الإجمالي:</span>
                                    <span className="text-blue-600 dark:text-blue-400">{grandTotal.toLocaleString()} ج.م</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={confirmCreateOrder}
                                    className="flex-1 py-2.5 px-4 bg-green-600 dark:bg-green-500 text-white rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                                >
                                    تأكيد الطلب
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 bg-black/50 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                                <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">تم إنشاء الطلب بنجاح!</h3>
                            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                                ماذا تريد أن تفعل الآن؟
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        if (createdOrderId) {
                                            navigate(`/orders/${createdOrderId}`);
                                        }
                                    }}
                                    className="w-full py-3 px-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    عرض تفاصيل الطلب
                                </button>
                                <button
                                    onClick={() => {
                                        if (createdOrderId) {
                                            window.open(`/orders/${createdOrderId}?print=true`, '_blank');
                                        }
                                    }}
                                    className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                    طباعة الفاتورة
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        setCreatedOrderId(null);
                                        resetForm();
                                    }}
                                    className="w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    إنشاء طلب جديد
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CheckoutColumn;
