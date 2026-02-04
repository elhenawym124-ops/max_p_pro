import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, Edit2, Trash2, Save, X, RefreshCw, Link2, Bell,
  CheckCircle, Clock, Package, Truck, XCircle, RotateCcw,
  ShoppingCart, CreditCard, AlertCircle, Loader2, ChevronUp, ChevronDown, Cog
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════════
// 🎨 Types
// ═══════════════════════════════════════════════════════════════

interface OrderStatus {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  statusType: 'order' | 'payment' | 'shipping' | 'preparation';
  source: 'system' | 'woocommerce' | 'custom';
  isSystemStatus: boolean;
  isActive: boolean;
  mapsToSystem?: string;
  wooCommerceStatus?: string;
  notifyCustomer: boolean;
  notifyAdmin: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 Icon Map
// ═══════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.ReactNode> = {
  Clock: <Clock className="w-4 h-4" />,
  CheckCircle: <CheckCircle className="w-4 h-4" />,
  CheckCircle2: <CheckCircle className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  Truck: <Truck className="w-4 h-4" />,
  XCircle: <XCircle className="w-4 h-4" />,
  RotateCcw: <RotateCcw className="w-4 h-4" />,
  Tag: <Tag className="w-4 h-4" />,
  ShoppingCart: <ShoppingCart className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  AlertCircle: <AlertCircle className="w-4 h-4" />,
  Cog: <Cog className="w-4 h-4" />
};

const AVAILABLE_ICONS = ['Clock', 'CheckCircle', 'Package', 'Truck', 'XCircle', 'RotateCcw', 'Tag', 'ShoppingCart', 'CreditCard', 'AlertCircle', 'Cog'];

const PRESET_COLORS = [
  '#F59E0B', '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981',
  '#EF4444', '#6B7280', '#EC4899', '#F97316', '#14B8A6'
];

const SYSTEM_STATUSES = [
  'PENDING', 'DRAFT', 'CONFIRMED', 'ON_HOLD', 'PROCESSING',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
];

// ═══════════════════════════════════════════════════════════════
// 🏷️ Order Status Manager Component
// ═══════════════════════════════════════════════════════════════

const OrderStatusManager: React.FC = () => {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'order' | 'payment' | 'shipping'>('order');
  const [editingStatus, setEditingStatus] = useState<OrderStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStatus, setNewStatus] = useState({
    code: '',
    name: '',
    nameEn: '',
    description: '',
    color: '#6B7280',
    icon: 'Tag',
    statusType: 'order' as 'order' | 'payment' | 'shipping' | 'preparation',
    mapsToSystem: '',
    wooCommerceStatus: '',
    notifyCustomer: false,
    notifyAdmin: false
  });

  // ═══════════════════════════════════════════════════════════════
  // 📡 API Calls
  // ═══════════════════════════════════════════════════════════════

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching order statuses...');
      const response = await fetch('/api/v1/order-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      console.log('📦 Order statuses response:', data);
      if (data.success) {
        setStatuses(data.data);
      } else {
        console.error('❌ Error:', data.message);
        toast.error(data.message || 'خطأ في جلب الحالات');
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      toast.error('خطأ في جلب الحالات');
    } finally {
      setLoading(false);
    }
  };

  const syncWooCommerce = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/v1/order-status/sync-woocommerce', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchStatuses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('خطأ في المزامنة مع WooCommerce');
    } finally {
      setSyncing(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/v1/order-status/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'تم تهيئة الحالات الافتراضية بنجاح');
        fetchStatuses();
      } else {
        toast.error(data.message || 'خطأ في تهيئة الحالات');
      }
    } catch (error) {
      toast.error('خطأ في تهيئة الحالات الافتراضية');
    } finally {
      setSyncing(false);
    }
  };

  const createStatus = async () => {
    if (!newStatus.code || !newStatus.name) {
      toast.error('الكود والاسم مطلوبان');
      return;
    }

    try {
      const response = await fetch('/api/v1/order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(newStatus)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تم إنشاء الحالة بنجاح');
        setShowAddModal(false);
        setNewStatus({
          code: '',
          name: '',
          nameEn: '',
          description: '',
          color: '#6B7280',
          icon: 'Tag',
          statusType: activeTab as 'order' | 'payment' | 'shipping' | 'preparation',
          mapsToSystem: '',
          wooCommerceStatus: '',
          notifyCustomer: false,
          notifyAdmin: false
        });
        fetchStatuses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('خطأ في إنشاء الحالة');
    }
  };

  const updateStatus = async (status: OrderStatus) => {
    try {
      const response = await fetch(`/api/v1/order-status/${status.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(status)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تم تحديث الحالة بنجاح');
        setEditingStatus(null);
        fetchStatuses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('خطأ في تحديث الحالة');
    }
  };

  const deleteStatus = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحالة؟')) return;

    try {
      const response = await fetch(`/api/v1/order-status/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تم حذف الحالة');
        fetchStatuses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('خطأ في حذف الحالة');
    }
  };

  const moveStatus = async (index: number, direction: 'up' | 'down') => {
    const items = [...filteredStatuses];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= items.length) return;

    [items[index], items[newIndex]] = [items[newIndex], items[index]];

    // Update local state
    const newStatuses = statuses.map(s => {
      const newIdx = items.findIndex(i => i.id === s.id);
      if (newIdx !== -1) {
        return { ...s, sortOrder: newIdx + 1 };
      }
      return s;
    });
    setStatuses(newStatuses);

    // Save to server
    try {
      await fetch('/api/v1/order-status/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ statusIds: items.map(i => i.id) })
      });
    } catch (error) {
      toast.error('خطأ في حفظ الترتيب');
      fetchStatuses();
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  // Filter statuses by activeTab, ensuring all matching statuses are shown
  const filteredStatuses = statuses
    .filter(s => {
      // Only show active statuses
      if (!s.isActive) return false;

      // If statusType exactly matches activeTab, show it
      if (s.statusType === activeTab) return true;

      // For backward compatibility: 
      // - If statusType is null/undefined/empty and viewing 'order' tab, treat as 'order'
      // - This handles old records that might not have statusType set
      if ((!s.statusType || s.statusType === '') && activeTab === 'order') return true;

      // Handle 'preparation' tab (was potentially missing in filter logic if not explicitly checked)
      if (s.statusType === 'preparation' && activeTab === 'preparation') return true;

      return false;
    })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // ═══════════════════════════════════════════════════════════════
  // 🎨 Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="p-6 w-full dark:text-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            إدارة حالات الطلبات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة وتخصيص حالات الطلبات والدفع</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={initializeDefaults}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            title="تهيئة جميع الحالات الافتراضية (الطلبات، الدفع، الشحن، التجهيز)"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تهيئة الحالات
          </button>
          <button
            onClick={syncWooCommerce}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            مزامنة WooCommerce
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            إضافة حالة
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('order')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'order'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
        >
          <Package className="w-4 h-4" />
          حالات الطلبات
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'payment'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
        >
          <CreditCard className="w-4 h-4" />
          حالات الدفع
        </button>
        <button
          onClick={() => setActiveTab('shipping')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'shipping'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
        >
          <Truck className="w-4 h-4" />
          حالات الشحن
        </button>
        <button
          onClick={() => setActiveTab('preparation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'preparation'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
        >
          <Cog className="w-4 h-4" />
          حالات التجهيز
        </button>
      </div>

      {/* Status List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStatuses.map((status, index) => (
            <div
              key={status.id}
              className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {editingStatus?.id === status.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
                      <input
                        type="text"
                        value={editingStatus.name}
                        onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالإنجليزية</label>
                      <input
                        type="text"
                        value={editingStatus.nameEn || ''}
                        onChange={(e) => setEditingStatus({ ...editingStatus, nameEn: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اللون</label>
                      <div className="flex gap-2">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditingStatus({ ...editingStatus, color })}
                            className={`w-8 h-8 rounded-full border-2 ${editingStatus.color === color ? 'border-gray-900 dark:border-white' : 'border-transparent'
                              }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ربط بحالة النظام</label>
                      <select
                        value={editingStatus.mapsToSystem || ''}
                        onChange={(e) => setEditingStatus({ ...editingStatus, mapsToSystem: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">-- بدون ربط --</option>
                        {SYSTEM_STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingStatus.notifyCustomer}
                        onChange={(e) => setEditingStatus({ ...editingStatus, notifyCustomer: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">إشعار العميل</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingStatus.notifyAdmin}
                        onChange={(e) => setEditingStatus({ ...editingStatus, notifyAdmin: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">إشعار الإدارة</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingStatus(null)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateStatus(editingStatus)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4" />
                      حفظ
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveStatus(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveStatus(index, 'down')}
                      disabled={index === filteredStatuses.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: status.color }}
                  >
                    {ICON_MAP[status.icon || 'Tag'] || <Tag className="w-4 h-4" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{status.name}</span>
                      {status.nameEn && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">({status.nameEn})</span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        {status.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-0.5 rounded text-xs ${status.source === 'system' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        status.source === 'woocommerce' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                        {status.source === 'system' ? 'نظام' :
                          status.source === 'woocommerce' ? 'WooCommerce' : 'مخصص'}
                      </span>
                      {status.mapsToSystem && (
                        <span className="flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {status.mapsToSystem}
                        </span>
                      )}
                      {status.wooCommerceStatus && (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <ShoppingCart className="w-3 h-3" />
                          {status.wooCommerceStatus}
                        </span>
                      )}
                      {(status.notifyCustomer || status.notifyAdmin) && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Bell className="w-3 h-3" />
                          إشعارات
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingStatus(status)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!status.isSystemStatus && (
                      <button
                        onClick={() => deleteStatus(status.id)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredStatuses.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">لا توجد حالات</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 text-blue-600 hover:underline"
          >
            إضافة حالة جديدة
          </button>
        </div>
      )}

      {/* Add Status Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold dark:text-white">إضافة حالة جديدة</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكود *</label>
                  <input
                    type="text"
                    value={newStatus.code}
                    onChange={(e) => setNewStatus({ ...newStatus, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="مثال: READY_TO_SHIP"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
                  <select
                    value={newStatus.statusType}
                    onChange={(e) => setNewStatus({ ...newStatus, statusType: e.target.value as 'order' | 'payment' | 'shipping' | 'preparation' })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="order">حالة طلب</option>
                    <option value="payment">حالة دفع</option>
                    <option value="shipping">حالة شحن</option>
                    <option value="preparation">حالة تجهيز</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالعربية *</label>
                  <input
                    type="text"
                    value={newStatus.name}
                    onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                    placeholder="مثال: جاهز للشحن"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالإنجليزية</label>
                  <input
                    type="text"
                    value={newStatus.nameEn}
                    onChange={(e) => setNewStatus({ ...newStatus, nameEn: e.target.value })}
                    placeholder="Ready to Ship"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                <textarea
                  value={newStatus.description}
                  onChange={(e) => setNewStatus({ ...newStatus, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اللون</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewStatus({ ...newStatus, color })}
                      className={`w-8 h-8 rounded-full border-2 ${newStatus.color === color ? 'border-gray-900 dark:border-white' : 'border-transparent'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأيقونة</label>
                <div className="flex gap-2 flex-wrap">
                  {AVAILABLE_ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewStatus({ ...newStatus, icon })}
                      className={`p-2 rounded-lg border ${newStatus.icon === icon ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      {ICON_MAP[icon]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ربط بحالة النظام</label>
                  <select
                    value={newStatus.mapsToSystem}
                    onChange={(e) => setNewStatus({ ...newStatus, mapsToSystem: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- بدون ربط --</option>
                    {SYSTEM_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حالة WooCommerce</label>
                  <input
                    type="text"
                    value={newStatus.wooCommerceStatus}
                    onChange={(e) => setNewStatus({ ...newStatus, wooCommerceStatus: e.target.value })}
                    placeholder="مثال: processing"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newStatus.notifyCustomer}
                    onChange={(e) => setNewStatus({ ...newStatus, notifyCustomer: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">إشعار العميل</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newStatus.notifyAdmin}
                    onChange={(e) => setNewStatus({ ...newStatus, notifyAdmin: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">إشعار الإدارة</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={createStatus}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusManager;

