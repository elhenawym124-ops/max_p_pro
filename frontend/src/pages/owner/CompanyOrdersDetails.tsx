import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRightIcon,
    BuildingOffice2Icon,
    ShoppingCartIcon,
    CurrencyDollarIcon,
    CalendarDaysIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    TruckIcon,
    CubeIcon,
    UserIcon,
    PhoneIcon,
    MapPinIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';

interface OrderItem {
    id: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    price: number;
    total: number;
    sku: string | null;
}

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    subtotal: number;
    shippingCost: number;
    discount: number;
    createdAt: string;
    customer: {
        name: string;
        phone: string;
        address: string;
        city: string;
    };
    items: OrderItem[];
    itemsCount: number;
}

interface CompanyDetails {
    id: string;
    name: string;
    logo: string | null;
}

interface OrdersResponse {
    success: boolean;
    data: {
        company: CompanyDetails;
        orders: Order[];
        stats: {
            totalOrders: number;
            totalRevenue: number;
            completedOrders: number;
            pendingOrders: number;
            cancelledOrders: number;
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', label: 'قيد الانتظار' },
    CONFIRMED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400', label: 'مؤكد' },
    PROCESSING: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-400', label: 'جاري التجهيز' },
    SHIPPED: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-400', label: 'تم الشحن' },
    DELIVERED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', label: 'تم التوصيل' },
    CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', label: 'ملغي' },
    RETURNED: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-800 dark:text-gray-400', label: 'مرتجع' },
};

const CompanyOrdersDetails: React.FC = () => {
    const { companyId } = useParams<{ companyId: string }>();
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [company, setCompany] = useState<CompanyDetails | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<OrdersResponse['data']['stats'] | null>(null);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1); // Last year to get all orders
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const getImageUrl = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const backendUrl = import.meta.env['VITE_API_URL']?.replace('/api/v1', '') || 'https://maxp-ai.pro';
        return `${backendUrl}/${path.replace(/^\/+/, '')}`;
    };

    useEffect(() => {
        if (companyId) {
            fetchOrders();
        }
    }, [companyId, statusFilter, startDate, endDate, page]);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get<OrdersResponse>(`owner/companies/${companyId}/orders`, {
                params: {
                    startDate,
                    endDate,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    page,
                    limit: 20
                }
            });
            
            if (response.data.success) {
                setCompany(response.data.data.company);
                setOrders(response.data.data.orders);
                setStats(response.data.data.stats);
                setTotalPages(response.data.data.pagination.totalPages);
                setTotal(response.data.data.pagination.total);
            } else {
                toast.error('فشل تحميل البيانات');
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error('فشل تحميل الطلبات');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        if (orders.length === 0) {
            toast.error('لا توجد طلبات للتصدير');
            return;
        }

        const headers = ['رقم الطلب', 'التاريخ', 'العميل', 'الهاتف', 'المدينة', 'الإجمالي', 'الحالة', 'المنتجات'];
        const rows = orders.map(order => [
            order.orderNumber,
            new Date(order.createdAt).toLocaleDateString('ar-EG'),
            order.customer.name,
            order.customer.phone,
            order.customer.city,
            order.total,
            statusColors[order.status]?.label || order.status,
            order.items.map(i => `${i.productName} (${i.quantity})`).join(' | ')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders-${company?.name}-${startDate}-to-${endDate}.csv`;
        link.click();

        toast.success('تم تصدير التقرير');
    };

    const toggleOrderExpand = (orderId: string) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    if (isLoading && !company) {
        return (
            <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/my-companies/reports')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ArrowRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                {company?.logo ? (
                                    <img src={getImageUrl(company.logo) || ''} alt={company.name} className="w-full h-full object-cover" />
                                ) : (
                                    <BuildingOffice2Icon className="w-6 h-6 text-gray-400" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800 dark:text-white">{company?.name}</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">تفاصيل الطلبات والمنتجات</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        تصدير
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                            <ShoppingCartIcon className="w-4 h-4" />
                            إجمالي الطلبات
                        </div>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalOrders}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                            <CurrencyDollarIcon className="w-4 h-4" />
                            الإيرادات
                        </div>
                        <p className="text-2xl font-bold text-green-600">{stats.totalRevenue.toLocaleString()} ج.م</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            مكتمل
                        </div>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.completedOrders}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                            <ClockIcon className="w-4 h-4 text-yellow-500" />
                            قيد الانتظار
                        </div>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.pendingOrders}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                            <XCircleIcon className="w-4 h-4 text-red-500" />
                            ملغي
                        </div>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.cancelledOrders}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">فلترة:</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">من:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">إلى:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    >
                        <option value="all">كل الحالات</option>
                        <option value="PENDING">قيد الانتظار</option>
                        <option value="CONFIRMED">مؤكد</option>
                        <option value="PROCESSING">جاري التجهيز</option>
                        <option value="SHIPPED">تم الشحن</option>
                        <option value="DELIVERED">تم التوصيل</option>
                        <option value="CANCELLED">ملغي</option>
                    </select>
                </div>
            </div>

            {/* Orders List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ShoppingCartIcon className="w-5 h-5 text-blue-600" />
                        الطلبات ({total})
                    </h2>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <ShoppingCartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">لا توجد طلبات</p>
                        <p className="text-sm">جرب تغيير الفلاتر</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {orders.map((order) => (
                            <div key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                {/* Order Header */}
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => toggleOrderExpand(order.id)}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">#{order.orderNumber}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]?.bg} ${statusColors[order.status]?.text}`}>
                                                {statusColors[order.status]?.label || order.status}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">المنتجات</p>
                                                <p className="font-bold text-gray-800 dark:text-white">{order.itemsCount}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">الإجمالي</p>
                                                <p className="font-bold text-green-600">{order.total.toLocaleString()} ج.م</p>
                                            </div>
                                            <EyeIcon className={`w-5 h-5 text-gray-400 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Order Details (Expanded) */}
                                {expandedOrder === order.id && (
                                    <div className="px-4 pb-4 animate-fadeIn">
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
                                            {/* Customer Info */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="flex items-center gap-2">
                                                    <UserIcon className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">العميل:</span>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-white">{order.customer.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">الهاتف:</span>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-white" dir="ltr">{order.customer.phone}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">المدينة:</span>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-white">{order.customer.city}</span>
                                                </div>
                                            </div>

                                            {/* Products */}
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                    <CubeIcon className="w-4 h-4" />
                                                    المنتجات
                                                </h4>
                                                <div className="space-y-2">
                                                    {order.items.map((item) => (
                                                        <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                                                                    {item.productImage ? (
                                                                        <img src={getImageUrl(item.productImage) || ''} alt={item.productName} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <CubeIcon className="w-6 h-6 m-3 text-gray-400" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-800 dark:text-white">{item.productName}</p>
                                                                    {item.sku && (
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {item.quantity} × {item.price.toLocaleString()} ج.م
                                                                </p>
                                                                <p className="font-bold text-gray-800 dark:text-white">{item.total.toLocaleString()} ج.م</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Order Summary */}
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600 dark:text-gray-400">المجموع الفرعي</span>
                                                    <span className="text-gray-800 dark:text-white">{order.subtotal.toLocaleString()} ج.م</span>
                                                </div>
                                                {order.discount > 0 && (
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600 dark:text-gray-400">الخصم</span>
                                                        <span className="text-red-600">-{order.discount.toLocaleString()} ج.م</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600 dark:text-gray-400">الشحن</span>
                                                    <span className="text-gray-800 dark:text-white">{order.shippingCost.toLocaleString()} ج.م</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <span className="text-gray-800 dark:text-white">الإجمالي</span>
                                                    <span className="text-green-600">{order.total.toLocaleString()} ج.م</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            صفحة {page} من {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm disabled:opacity-50"
                            >
                                السابق
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm disabled:opacity-50"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyOrdersDetails;
