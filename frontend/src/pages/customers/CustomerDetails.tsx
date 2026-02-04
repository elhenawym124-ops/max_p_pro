import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowRightIcon,
    PencilIcon,
    TrashIcon,
    ChatBubbleLeftRightIcon,
    ShoppingBagIcon,
    ClockIcon,
    DocumentTextIcon,
    UserIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    TagIcon,
    PlusIcon,
    XMarkIcon,
    ArrowDownTrayIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCurrency } from '../../utils/currency';

interface CustomerDetailsData {
    customer: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        country?: string;
        tags: string[];
        notes?: string;
        status: string;
        customerRating?: string;
        createdAt: string;
        updatedAt: string;
    };
    stats: {
        ordersCount: number;
        conversationsCount: number;
        totalSpent: number;
        averageOrderValue: number;
    };
    recentOrders: Array<{
        id: string;
        orderNumber: string;
        status: string;
        total: number;
        createdAt: string;
    }>;
    recentConversations: Array<{
        id: string;
        channel: string;
        status: string;
        lastMessageAt: string;
        createdAt: string;
    }>;
    notes: Array<{
        id: string;
        content: string;
        createdAt: string;
        author?: {
            firstName: string;
            lastName: string;
        };
    }>;
    activities: Array<{
        type: string;
        id: string;
        title: string;
        status?: string;
        value?: number;
        content?: string;
        author?: string;
        timestamp: string;
    }>;
}

const CustomerDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { formatDate } = useDateFormat();
    const navigate = useNavigate();

    const [data, setData] = useState<CustomerDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'conversations' | 'notes' | 'activity'>('info');
    const [newNote, setNewNote] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);

    // New state for additional features
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [customerTags, setCustomerTags] = useState<string[]>([]);
    const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

    useEffect(() => {
        loadCustomerDetails();
    }, [id]);

    // Initialize tags when data loads
    useEffect(() => {
        if (data?.customer?.tags) {
            try {
                const parsedTags = typeof data.customer.tags === 'string'
                    ? JSON.parse(data.customer.tags)
                    : data.customer.tags;
                setCustomerTags(Array.isArray(parsedTags) ? parsedTags : []);
            } catch {
                setCustomerTags([]);
            }
        }
    }, [data?.customer?.tags]);

    const loadCustomerDetails = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await apiClient.get(`/customers/${id}`);
            console.log('Customer API Response:', JSON.stringify(response.data, null, 2));

            // Normalize the response data structure
            let customerData = response.data?.data || response.data;

            // If the response is { customer: {...} } use it directly
            // If the response IS the customer object (has firstName), wrap it
            if (customerData && !customerData.customer && customerData.firstName) {
                customerData = {
                    customer: customerData,
                    stats: { ordersCount: 0, conversationsCount: 0, totalSpent: 0, averageOrderValue: 0 },
                    recentOrders: [],
                    recentConversations: [],
                    notes: [],
                    activities: []
                };
            }

            console.log('Normalized customer data:', JSON.stringify(customerData, null, 2));
            setData(customerData);
        } catch (err: any) {
            console.error('Error loading customer:', err);
            setError(err.response?.data?.message || err.message || 'فشل في تحميل بيانات العميل');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsAddingNote(true);
        try {
            await apiClient.post(`/customers/${id}/notes`, { content: newNote });
            setNewNote('');
            loadCustomerDetails(); // Reload to get fresh notes
        } catch (err: any) {
            console.error('Error adding note:', err);
        } finally {
            setIsAddingNote(false);
        }
    };

    // 🗑️ Delete customer handler
    const handleDeleteCustomer = async () => {
        setIsDeleting(true);
        try {
            await apiClient.delete(`/customers/${id}`);
            navigate('/customers', { replace: true });
        } catch (err: any) {
            console.error('Error deleting customer:', err);
            alert(err.response?.data?.message || 'فشل في حذف العميل');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // 🗑️ Delete note handler
    const handleDeleteNote = async (noteId: string) => {
        setDeletingNoteId(noteId);
        try {
            await apiClient.delete(`/customers/notes/${noteId}`);
            loadCustomerDetails(); // Reload to refresh notes
        } catch (err: any) {
            console.error('Error deleting note:', err);
            alert(err.response?.data?.message || 'فشل في حذف الملاحظة');
        } finally {
            setDeletingNoteId(null);
        }
    };

    // 🏷️ Add tag handler
    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        const updatedTags = [...customerTags, newTag.trim()];
        try {
            await apiClient.put(`/customers/${id}/tags`, { tags: updatedTags });
            setCustomerTags(updatedTags);
            setNewTag('');
        } catch (err: any) {
            console.error('Error adding tag:', err);
            alert(err.response?.data?.message || 'فشل في إضافة العلامة');
        }
    };

    // 🏷️ Remove tag handler
    const handleRemoveTag = async (tagToRemove: string) => {
        const updatedTags = customerTags.filter(tag => tag !== tagToRemove);
        try {
            await apiClient.put(`/customers/${id}/tags`, { tags: updatedTags });
            setCustomerTags(updatedTags);
        } catch (err: any) {
            console.error('Error removing tag:', err);
            alert(err.response?.data?.message || 'فشل في حذف العلامة');
        }
    };

    // 📤 Export customer data
    const handleExportCustomer = () => {
        if (!data) return;
        const exportData = {
            customer: data.customer,
            stats: data.stats,
            orders: data.recentOrders,
            conversations: data.recentConversations,
            notes: data.notes,
            activities: data.activities,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customer_${data.customer.firstName}_${data.customer.lastName}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 💬 Start WhatsApp conversation
    const handleStartWhatsApp = () => {
        const phone = data?.customer?.phone;
        if (phone) {
            // Remove any non-digit characters and ensure it starts with country code
            const cleanPhone = phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            LEAD: 'bg-yellow-100 text-yellow-800',
            ACTIVE: 'bg-green-100 text-green-800',
            INACTIVE: 'bg-gray-100 text-gray-800',
            VIP: 'bg-purple-100 text-purple-800',
            BLOCKED: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getRatingBadge = (rating?: string) => {
        if (!rating) return null;
        const badges: Record<string, { bg: string; icon: string }> = {
            EXCELLENT: { bg: 'bg-purple-100 text-purple-700', icon: '💎' },
            GOOD: { bg: 'bg-blue-100 text-blue-700', icon: '✅' },
            AVERAGE: { bg: 'bg-gray-100 text-gray-700', icon: '➖' },
            BAD: { bg: 'bg-red-100 text-red-700', icon: '⛔' }
        };
        const badge = badges[rating];
        if (!badge) return null;
        return (
            <span className={`px-2 py-1 rounded-full text-xs ${badge.bg}`}>
                {badge.icon} {rating}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error || !data || !data.customer) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">{error || 'العميل غير موجود'}</p>
                <Link to="/customers" className="text-indigo-600 hover:underline mt-4 inline-block">
                    العودة للقائمة
                </Link>
            </div>
        );
    }

    const customer = data.customer || {};
    const stats = data.stats || { ordersCount: 0, conversationsCount: 0, totalSpent: 0, averageOrderValue: 0 };
    const recentOrders = data.recentOrders || [];
    const recentConversations = data.recentConversations || [];
    const notes = data.notes || [];
    const activities = data.activities || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/customers" className="text-gray-500 hover:text-gray-700">
                        <ArrowRightIcon className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {customer.firstName} {customer.lastName}
                        </h1>
                        <div className="flex gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(customer.status)}`}>
                                {customer.status}
                            </span>
                            {getRatingBadge(customer.customerRating)}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* WhatsApp Button */}
                    {customer.phone && (
                        <button
                            onClick={handleStartWhatsApp}
                            className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50"
                        >
                            <ChatBubbleLeftRightIcon className="h-4 w-4 ml-2" />
                            WhatsApp
                        </button>
                    )}
                    {/* Export Button */}
                    <button
                        onClick={handleExportCustomer}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4 ml-2" />
                        تصدير
                    </button>
                    {/* Edit Button */}
                    <button
                        onClick={() => navigate(`/customers/${id}/edit`)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <PencilIcon className="h-4 w-4 ml-2" />
                        تعديل
                    </button>
                    {/* Delete Button */}
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                        <TrashIcon className="h-4 w-4 ml-2" />
                        حذف
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex items-center gap-3">
                        <ShoppingBagIcon className="h-8 w-8 text-indigo-500" />
                        <div>
                            <p className="text-sm text-gray-500">الطلبات</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.ordersCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex items-center gap-3">
                        <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-500" />
                        <div>
                            <p className="text-sm text-gray-500">المحادثات</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.conversationsCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">$</div>
                        <div>
                            <p className="text-sm text-gray-500">إجمالي المشتريات</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalSpent)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">~</div>
                        <div>
                            <p className="text-sm text-gray-500">متوسط الطلب</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.averageOrderValue)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        {[
                            { key: 'info', label: 'المعلومات', icon: UserIcon },
                            { key: 'orders', label: 'الطلبات', icon: ShoppingBagIcon },
                            { key: 'conversations', label: 'المحادثات', icon: ChatBubbleLeftRightIcon },
                            { key: 'notes', label: 'الملاحظات', icon: DocumentTextIcon },
                            { key: 'activity', label: 'النشاطات', icon: ClockIcon }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === tab.key
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">معلومات الاتصال</h3>
                                <div className="space-y-3">
                                    {customer.phone && (
                                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                            <PhoneIcon className="h-5 w-5" />
                                            <span>{customer.phone}</span>
                                        </div>
                                    )}
                                    {customer.email && (
                                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                            <EnvelopeIcon className="h-5 w-5" />
                                            <span>{customer.email}</span>
                                        </div>
                                    )}
                                    {(customer.address || customer.city || customer.country) && (
                                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                            <MapPinIcon className="h-5 w-5" />
                                            <span>{[customer.address, customer.city, customer.country].filter(Boolean).join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">العلامات</h3>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {customerTags.length > 0 ? (
                                        customerTags.map((tag, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm group">
                                                <TagIcon className="h-3 w-3" />
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XMarkIcon className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-gray-500">لا توجد علامات</p>
                                    )}
                                </div>
                                {/* Add new tag */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={e => setNewTag(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                                        placeholder="أضف علامة جديدة..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <button
                                        onClick={handleAddTag}
                                        disabled={!newTag.trim()}
                                        className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div>
                            {recentOrders.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الطلب</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {recentOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-4 py-3">
                                                    <Link to={`/orders/${order.id}`} className="text-indigo-600 hover:underline">
                                                        #{order.orderNumber}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 rounded text-xs bg-gray-100">{order.status}</span>
                                                </td>
                                                <td className="px-4 py-3">{formatCurrency(order.total)}</td>
                                                <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-center text-gray-500 py-8">لا توجد طلبات</p>
                            )}
                        </div>
                    )}

                    {/* Conversations Tab */}
                    {activeTab === 'conversations' && (
                        <div>
                            {recentConversations.length > 0 ? (
                                <div className="space-y-3">
                                    {recentConversations.map(conv => (
                                        <div key={conv.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{conv.channel}</p>
                                                    <p className="text-sm text-gray-500">{conv.status}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500">{formatDate(conv.lastMessageAt || conv.createdAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">لا توجد محادثات</p>
                            )}
                        </div>
                    )}

                    {/* Notes Tab */}
                    {activeTab === 'notes' && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    placeholder="أضف ملاحظة جديدة..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={isAddingNote || !newNote.trim()}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <PlusIcon className="h-4 w-4 ml-2" />
                                    إضافة
                                </button>
                            </div>
                            {notes.length > 0 ? (
                                <div className="space-y-3">
                                    {notes.map(note => (
                                        <div key={note.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-r-4 border-yellow-400 relative group">
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                disabled={deletingNoteId === note.id}
                                                className="absolute top-2 left-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                            >
                                                {deletingNoteId === note.id ? (
                                                    <span className="animate-spin">⏳</span>
                                                ) : (
                                                    <TrashIcon className="h-4 w-4" />
                                                )}
                                            </button>
                                            <p className="text-gray-800 dark:text-gray-200">{note.content}</p>
                                            <div className="mt-2 text-sm text-gray-500">
                                                {note.author && `${note.author.firstName} ${note.author.lastName} • `}
                                                {formatDate(note.createdAt)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">لا توجد ملاحظات</p>
                            )}
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div>
                            {activities.length > 0 ? (
                                <div className="relative">
                                    <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                                    <div className="space-y-4">
                                        {activities.map((activity, i) => (
                                            <div key={i} className="relative pr-10">
                                                <div className={`absolute right-2 w-4 h-4 rounded-full ${activity.type === 'order' ? 'bg-indigo-500' :
                                                    activity.type === 'conversation' ? 'bg-green-500' : 'bg-yellow-500'
                                                    }`} />
                                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{activity.title}</p>
                                                            {activity.status && (
                                                                <span className="text-sm text-gray-500">{activity.status}</span>
                                                            )}
                                                            {activity.content && (
                                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{activity.content}</p>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">لا توجد نشاطات</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                تأكيد حذف العميل
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            هل أنت متأكد من حذف العميل <strong>{customer.firstName} {customer.lastName}</strong>؟
                            <br />
                            <span className="text-red-500 text-sm">سيتم حذف جميع البيانات المرتبطة (الطلبات، المحادثات، الملاحظات) ولا يمكن التراجع عن هذا الإجراء.</span>
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleDeleteCustomer}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        جاري الحذف...
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon className="h-4 w-4" />
                                        حذف العميل
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDetails;
