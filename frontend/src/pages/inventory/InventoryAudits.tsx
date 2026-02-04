import React, { useState, useEffect } from 'react';
import {
    ClipboardDocumentCheckIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useDateFormat } from '../../hooks/useDateFormat';

interface AuditLog {
    id: string;
    type: string;
    quantity: number;
    userName: string;
    createdAt: string;
    notes?: string;
    isApproved: boolean;
    batchNumber?: string | null;
    expiryDate?: string | null;
    products: {
        name: string;
        sku: string;
    };
    warehouses: {
        name: string;
    };
}

const InventoryAudits: React.FC = () => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const [audits, setAudits] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAudits();
    }, []);

    const fetchAudits = async () => {
        try {
            setLoading(true);
            const response = await companyAwareApi.get('/inventory/movements');
            if (response.data.success) {
                setAudits(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching inventory audits:', error);
        } finally {
            setLoading(false);
        }
    };

    const approveMovement = async (movementId: string) => {
        try {
            const response = await companyAwareApi.post('/inventory/approve-movement', { movementId });
            if (response.data.success) {
                alert('تم اعتماد الحركة بنجاح');
                fetchAudits();
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'فشل في اعتماد الحركة');
        }
    };

    const filteredAudits = audits.filter(audit =>
        audit.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardDocumentCheckIcon className="h-8 w-8 text-blue-600" />
                        {t('sidebar.inventoryAudits')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('inventory.auditDescription', 'تتبع حركات المخزون وعمليات الجرد المحاسبي')}
                    </p>
                </div>

                <button
                    onClick={fetchAudits}
                    className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('common.updateData')}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        />
                    </div>
                    <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 transition-all shadow-sm">
                        <FunnelIcon className="h-4 w-4" />
                        {t('common.filter')}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-4 font-semibold">{t('common.date')}</th>
                                <th className="px-6 py-4 font-semibold">{t('products.productName')}</th>
                                <th className="px-6 py-4 font-semibold">الدفعة</th>
                                <th className="px-6 py-4 font-semibold">{t('common.quantity')}</th>
                                <th className="px-6 py-4 font-semibold">الحالة</th>
                                <th className="px-6 py-4 font-semibold">{t('common.user', 'بواسطة')}</th>
                                <th className="px-6 py-4 font-semibold">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded"></div></td>
                                    </tr>
                                ))
                            ) : filteredAudits.length > 0 ? (
                                filteredAudits.map((audit) => (
                                    <tr key={audit.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!audit.isApproved ? 'bg-yellow-50/50 dark:bg-yellow-900/20' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-2 text-xs">
                                                <CalendarIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                {formatDateTime(audit.createdAt)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{audit.products?.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {audit.products?.sku}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                                            {audit.batchNumber || '---'}
                                        </td>
                                        <td className={`px-6 py-4 font-semibold ${audit.type.includes('IN') || audit.type === 'PURCHASE' ? 'text-green-600' : 'text-red-600'}`}>
                                            {audit.type.includes('IN') || audit.type === 'PURCHASE' ? `+${audit.quantity}` : `-${audit.quantity}`}
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">{audit.type}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {audit.isApproved ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700">معتمد</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-100 text-yellow-700">بانتظار الموافقة</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            <div className="text-sm">{audit.userName}</div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500">{audit.warehouses?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            {!audit.isApproved ? (
                                                <button
                                                    onClick={() => approveMovement(audit.id)}
                                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 shadow-sm"
                                                >
                                                    اعتماد
                                                </button>
                                            ) : (
                                                <div className="text-xs italic truncate max-w-[100px]" title={audit.notes}>{audit.notes || '---'}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {t('common.noResults')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryAudits;
